# Getting Started - Next Steps

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd NodeConsoleApp1
npm install
```

This will install:
- Express.js, Prisma, JWT, Argon2
- TypeScript, ESLint, Jest, Supertest
- All other production dependencies

**Note:** If npm execution policy error occurs in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install
```

### 2. Setup PostgreSQL Database

**Using Docker (easiest):**
```bash
docker run --name mental-health-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

**Or use Docker Compose:**
```bash
docker-compose up -d
```

**Or install PostgreSQL locally** and create database:
```sql
CREATE DATABASE mental_health_db;
```

### 3. Configure Environment
```bash
# Copy template
cp .env.example .env

# Edit .env with your database URL
# If using Docker: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mental_health_db"
```

### 4. Setup Database
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed sample data (optional)
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

Server runs on **http://localhost:3000**

---

## 🧪 Test the API

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
	"email": "test@example.com",
	"password": "TestPassword123!",
	"confirmPassword": "TestPassword123!",
	"displayName": "Test User"
  }'
```

Response includes `accessToken` and `refreshToken`.

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
	"email": "test@example.com",
	"password": "TestPassword123!"
  }'
```

### 3. Get Current User
```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Replace `YOUR_TOKEN` with the token from login response.

### 4. Get Feed
```bash
curl -X GET http://localhost:3000/api/v1/posts/feed
```

More examples in **API.md**

---

## 🛠️ Development

### Run Tests
```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm test:watch

# Coverage report
npm test:coverage
```

### Build for Production
```bash
npm run build
```

Creates `dist/` folder with compiled JavaScript.

### Start Production Server
```bash
npm start
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

---

## 📚 Documentation

All documentation is in the root folder:

- **README.md** - Features, setup, project structure
- **PROJECT_SUMMARY.md** - Overview of what was built
- **ARCHITECTURE.md** - System design, scaling, security (must-read)
- **DEPLOYMENT.md** - Docker, Kubernetes, production setup
- **API.md** - Complete API reference with examples
- **DELIVERABLES.md** - Complete list of all deliverables

Start with **README.md**, then explore others as needed.

---

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t mental-health-api:latest .
```

### Run in Docker
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@db:5432/mental_health_db" \
  -e JWT_SECRET="your-secret-key" \
  mental-health-api:latest
```

### Use Docker Compose (Recommended)
```bash
docker-compose up -d
```

Starts both API and PostgreSQL automatically.

---

## ☸️ Kubernetes Deployment

See **DEPLOYMENT.md** for complete Kubernetes setup including:
- Creating secrets
- Deploying manifests
- Setting up services
- Configuring ingress

---

## 📊 Database Management

### Access Database (PostgreSQL)
```bash
psql -U postgres -h localhost -d mental_health_db
```

### Prisma Studio (Visual Database Browser)
```bash
npm run db:studio
```

Opens interactive database viewer on http://localhost:5555

### Backup Database
```bash
pg_dump -U postgres -h localhost mental_health_db > backup.sql
```

### Restore Database
```bash
psql -U postgres -h localhost < backup.sql
```

---

## 🔍 Troubleshooting

### "Cannot find module" errors
```bash
# Regenerate Prisma client
npm run db:generate

# Rebuild TypeScript
npm run build
```

### Database connection fails
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check DATABASE_URL in .env
# Default: postgresql://postgres:postgres@localhost:5432/mental_health_db
```

### Port 3000 already in use
```bash
# Use different port
PORT=3001 npm run dev

# Or kill process using port 3000
# On macOS/Linux: lsof -i :3000 | kill -9 <PID>
# On Windows: netstat -ano | findstr :3000
```

### Tests failing
```bash
# Clear Jest cache
npm test -- --clearCache

# Run specific test file
npm test -- tests/auth/security.test.ts
```

---

## 📋 Project Structure Quick Reference

```
src/
├── auth/          # JWT & password security
├── config/        # Configuration & logging
├── database/      # Prisma client
├── middleware/    # Express middleware
├── modules/       # Domain modules (user, post, etc.)
├── types/         # TypeScript types
├── utils/         # Utilities
├── app.ts         # Express app
└── index.ts       # Server entry

prisma/
├── schema.prisma  # Database schema
├── migrations/    # SQL migrations
└── seed.ts        # Test data

tests/
├── auth/          # Auth tests
├── modules/       # Module tests
└── api/           # E2E tests

Documentation:
├── README.md         # Quick start
├── ARCHITECTURE.md   # System design
├── DEPLOYMENT.md     # Production setup
├── API.md           # API reference
└── PROJECT_SUMMARY.md
```

---

## 🚀 Next Steps (by priority)

### 1. Get It Running (30 minutes)
- [ ] Install dependencies
- [ ] Setup PostgreSQL
- [ ] Configure .env
- [ ] Run migrations
- [ ] Start dev server
- [ ] Test API with curl

### 2. Explore the Code (1-2 hours)
- [ ] Read README.md
- [ ] Understand project structure
- [ ] Review src/modules/user/ as example
- [ ] Look at schema.prisma
- [ ] Check API.md for endpoints

### 3. Run Tests (30 minutes)
- [ ] Run `npm test`
- [ ] Check test coverage
- [ ] Look at test examples
- [ ] Write a simple test

### 4. Read Architecture (1-2 hours)
- [ ] Read ARCHITECTURE.md
- [ ] Understand modular design
- [ ] Review security patterns
- [ ] Study scaling strategy

### 5. Deployment (1-2 hours)
- [ ] Build Docker image
- [ ] Try Docker Compose
- [ ] Read DEPLOYMENT.md
- [ ] Review Kubernetes manifests

### 6. Features & Extensions (ongoing)
- [ ] Add new endpoints
- [ ] Create new modules
- [ ] Implement real-time (WebSocket)
- [ ] Add private messaging
- [ ] Integrate mobile SDKs

---

## 📞 Support & Issues

If you encounter issues:

1. Check **DEPLOYMENT.md** troubleshooting section
2. Review error message in console
3. Check `.env` configuration
4. Verify PostgreSQL is running
5. Clear cache: `npm test -- --clearCache`
6. Rebuild: `npm run build`

---

## 💡 Key Features to Explore

### Authentication
- View: `src/modules/user/service.ts` (register/login logic)
- Test: `tests/api/user.e2e.test.ts` (E2E tests)

### Security
- View: `src/auth/security.ts` (password hashing, validation)
- Middleware: `src/middleware/auth.ts` (JWT verification)

### Database
- Schema: `prisma/schema.prisma` (40+ models)
- Migrations: `prisma/migrations/` (SQL)

### API Design
- User module: `src/modules/user/` (complete example)
- Routes: Clear separation of routes, controller, service

### Moderation
- Report creation: `src/modules/moderation/`
- Safety-first design patterns

### Privacy
- Journal: `src/modules/journal/` (encrypted by design)
- Privacy settings: User controlled

---

## 🎓 Learning Path

1. **Start here**: README.md (5 min)
2. **Then read**: PROJECT_SUMMARY.md (10 min)
3. **Explore code**: `src/modules/user/` (15 min)
4. **Study architecture**: ARCHITECTURE.md (30 min)
5. **Review API**: API.md + test endpoints (30 min)
6. **Setup & test**: Local development (30 min)
7. **Deploy**: Docker or production (1-2 hours)

---

## 🎯 Success Criteria

You'll know everything is working when:
- ✅ `npm install` completes without errors
- ✅ Database migrations run successfully
- ✅ `npm run dev` starts server on port 3000
- ✅ `/api/v1/health` returns `{status: "ok"}`
- ✅ Can register a user via `/api/v1/auth/register`
- ✅ Can login via `/api/v1/auth/login`
- ✅ Can get current user via `/api/v1/users/me`
- ✅ All tests pass with `npm test`

---

## 📌 Important Configuration

### .env Template
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mental_health_db"
JWT_SECRET="change-this-in-production"
CORS_ORIGIN="http://localhost:3000"
```

### Production .env
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:password@prod-db.example.com/db"
JWT_SECRET="long-random-string-at-least-32-chars"
CORS_ORIGIN="https://your-domain.com"
```

---

**🎉 You're all set! Follow the Quick Start section above to get running.**

Questions? Check the documentation files or review the well-commented source code.

Happy coding! 🚀
