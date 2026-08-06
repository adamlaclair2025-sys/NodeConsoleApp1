# Mental Health Platform - Backend

Enterprise-scale mental health social platform backend with peer support, learning management, crisis resources, and comprehensive safety features.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

### Build & Run

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Watch tests
npm test:watch

# Coverage report
npm test:coverage
```

## Project Structure

```
src/
├── auth/              # Authentication & JWT
├── config/           # Configuration & Logger
├── database/         # Prisma client
├── middleware/       # Express middleware
├── modules/         # Domain modules
│   ├── user/       # User management
│   ├── post/       # Social feed
│   ├── search/     # Search functionality
│   └── health/     # Health checks
├── types/           # TypeScript types
├── utils/           # Utility functions
├── app.ts          # Express app setup
└── index.ts        # Server entry point

prisma/
├── schema.prisma    # Database schema (40+ models)
├── migrations/      # SQL migrations
└── seed.ts         # Database seed

tests/
├── auth/           # Authentication tests
├── modules/        # Module unit tests
└── api/            # E2E API tests
```

## Features

### Delivery Roadmap
A structured implementation roadmap has been added in [ROADMAP.md](ROADMAP.md) and is ordered to support safety, privacy, accessibility, and scalable delivery.

### Authentication & Security
- ✅ JWT-based authentication
- ✅ Argon2id password hashing
- ✅ Password strength validation
- ✅ Rate limiting on auth endpoints
- ✅ Request validation with Zod
- ✅ Audit logging

### User Management
- ✅ Registration & login
- ✅ Profile management
- ✅ Account deactivation
- ✅ Privacy & accessibility settings
- ✅ Emergency contacts
- ✅ Session management

### Social Features
- ✅ Chronological feed
- ✅ Posts with media
- ✅ Comments & threaded replies
- ✅ Supportive reactions (no dislikes)
- ✅ Global search
- ✅ Community support

### Safety & Moderation
- ✅ Content reporting
- ✅ Moderation workflows
- ✅ Crisis resource library
- ✅ Audit logs
- ✅ Error tracking

### Learning & Wellness
- ✅ Workshop system
- ✅ Progress tracking
- ✅ Private journaling
- ✅ Mood logging

## Database Schema

40+ models covering:
- User identity & settings
- Social posts & comments
- Communities & membership
- Moderation & reporting
- Private journals
- Learning progress
- Crisis resources
- Notifications
- Audit & error logs

See `prisma/schema.prisma` for full schema.

## API Endpoints

### Health
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Status with auth info

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me/profile` - Update profile
- `DELETE /api/v1/users/me` - Delete account

### Posts
- `GET /api/v1/posts/feed` - Get chronological feed
- `POST /api/v1/posts` - Create post
- `GET /api/v1/posts/:id` - Get post by ID
- `DELETE /api/v1/posts/:id` - Delete post

### Search
- `GET /api/v1/search` - Global search

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific test file
npm test -- auth/security.test.ts

# Watch mode
npm test:watch
```

## Configuration

All configuration through environment variables (.env):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/mental_health_db"
JWT_SECRET="change-this-in-production"
JWT_EXPIRES_IN="7d"
LOG_LEVEL="debug"
CORS_ORIGIN="http://localhost:3000"
```

## Development Guidelines

### Code Organization
- **Modular structure**: Each domain has its own folder
- **Separation of concerns**: Controllers → Services → Repositories → Database
- **Dependency injection**: Instances exported from modules
- **Type safety**: Full TypeScript with strict mode

### Testing
- Unit tests for services & utilities
- E2E tests for API endpoints
- Auth tests for security functions
- Minimum 50% coverage threshold

### Security
- All passwords hashed with Argon2id
- JWT tokens with expiration
- Rate limiting on sensitive endpoints
- Input validation with Zod
- CORS & helmet security headers
- Audit logging for all actions

### Error Handling
- Custom error classes (AppError, ValidationError, NotFoundError)
- Consistent error response format
- Structured logging with pino
- Error tracking & audit logs

## Deployment

### Prerequisites
- PostgreSQL database
- Node.js 18+ runtime
- Environment variables configured

### Steps
1. Install dependencies: `npm install`
2. Generate Prisma: `npm run db:generate`
3. Run migrations: `npm run db:deploy`
4. Build: `npm run build`
5. Start: `npm start`

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow existing module patterns
- Add JSDoc comments for public functions
- Include tests for new features
- Update documentation

### Pull Request Process
1. Create feature branch
2. Follow code style
3. Add/update tests
4. Update documentation
5. Request review

## License

MIT

## Support

For issues, questions, or contributions, please open an issue or pull request.
