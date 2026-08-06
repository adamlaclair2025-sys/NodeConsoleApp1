# Architecture Overview

## System Design

This is an enterprise-scale mental health platform built with a modular, scalable architecture following Clean Architecture, Domain-Driven Design, and Hexagonal Architecture principles.

## Core Architecture Patterns

### 1. Modular Monolith
- Each domain (User, Post, Community, Journal, etc.) has its own module
- Modules are organized by domain with clear boundaries
- Each module contains: routes, controller, service, repository, and schemas
- Modules can be extracted into microservices in the future

### 2. Layered Architecture
```
Router → Controller → Service → Repository → Database
		 ↓
	  Middleware (Auth, Validation, Error Handling)
```

- **Router**: HTTP route definitions and method routing
- **Controller**: HTTP request/response handling
- **Service**: Business logic and orchestration
- **Repository**: Data access layer abstractions
- **Database**: Prisma ORM with PostgreSQL

### 3. Dependency Injection
- Services, repositories, and controllers are singletons exported from modules
- No tight coupling between layers
- Easy to test and swap implementations

### 4. Configuration Management
- Environment variables via `.env`
- Centralized config in `src/config/index.ts`
- Different configs per environment (dev, staging, prod)

## Module Structure

Each domain module follows this pattern:

```
src/modules/user/
├── routes.ts         # Express route definitions
├── controller.ts     # HTTP handlers
├── service.ts        # Business logic
├── repository.ts     # Data access (optional)
├── schemas.ts        # Zod validation schemas
└── types.ts          # TypeScript types (optional)
```

### Example: User Module
1. **routes.ts**: Defines POST /auth/register, POST /auth/login, GET /users/me
2. **controller.ts**: Handles request parsing, calls service, returns response
3. **service.ts**: Implements registration, login, profile update logic
4. **repository.ts**: Handles user data queries (create, find, update, delete)
5. **schemas.ts**: Defines Zod validation for register, login, profile update

## Enterprise Platform Blueprint

### Product Purpose and Guardrails
- Build a psychologically safe, trauma-informed, privacy-first social and learning ecosystem focused on community, reflection, wellbeing, education, and crisis support.
- The platform must not present itself as a replacement for emergency services, diagnosis, psychiatric care, or licensed therapy.
- Every experience must communicate boundaries clearly, compassionately, and without shaming users.
- The product is free for all users with no subscriptions, ads, payments, or premium tiers.
- The platform must prioritize meaningful engagement over addictive engagement and must avoid manipulation, rage-bait, public leaderboards, streak punishment, and exploitative push loops.

### Core Design Principles
- Psychological safety and trauma-informed design
- User autonomy, privacy by default, and accessibility by default
- Empathy, low cognitive load, inclusivity, and cultural sensitivity
- Security by design, reliability under crisis scenarios, and maintainability
- Ethical AI, transparent moderation, and clear human review for high-risk decisions

### Supported Platforms and Delivery Scope
- Responsive web, PWA, desktop browser, tablet, iOS, and Android experiences
- Administrative, moderator, support-staff, volunteer, and future clinical dashboards
- Secure backend APIs, real-time infrastructure, learning tools, crisis resources, analytics, and search

### User Types and Access Model
- Guest, registered, anonymous, community member, moderator, support staff, volunteer, organization admin, platform admin, privacy/security admin, and future clinical roles
- Use RBAC and ABAC together, with server-side authorization enforced everywhere
- Do not infer permissions from UI visibility alone

### Core Domain Modules
- Identity and account safety: authentication, MFA, recovery, device management, and session governance
- Social experience: posts, comments, reactions, feeds, content warnings, visibility controls, and media handling
- Community system: membership, moderation, rules, roles, invites, announcements, and resource libraries
- Crisis safety and support: resource library, safety plans, quick exit, wellness nudges, escalation, and human review
- Learning and wellness: workshops, courses, lessons, progress tracking, certificates, transcripts, and offline access
- Private journaling: encrypted private entries, drafts, mood tracking, and export/deletion controls
- Notifications and search: centralized notification service, permission-aware search, and safe content previews
- Moderation and governance: reporting, review queues, appeals, audit logs, and policy-based actioning
- Privacy, security, and compliance: consent management, data export/deletion, retention, audit logging, and regional controls
- AI and analytics: optional, consent-based assistance with clear model cards, bias review, and human oversight

### Module Contract Standard
Every module should define, at minimum:
- Domain responsibility and data ownership
- Public APIs and internal services
- Authorization rules and security controls
- Events produced and consumed
- Database dependencies and migration impact
- Caching strategy and rate-limiting needs
- Audit-log and observability requirements
- Test strategy and failure modes
- Future extraction path for service decomposition

### Cross-Cutting Requirements
- Security: TLS 1.3, strong hashing, short-lived tokens, MFA, RBAC/ABAC, rate limiting, input validation, output encoding, CSP, secure uploads, and tamper-resistant audit logs
- Privacy: explicit consent, transparent data use, export/delete workflows, retention visibility, and regional controls
- Accessibility: WCAG 2.2 AA support with keyboard navigation, screen-reader support, captions, reduced motion, and cognitive-load reduction options
- Localization: multilingual UI, locale-aware formatting, RTL support, and region-specific crisis resources
- Offline-first behavior: encrypted local storage, draft sync, worksheet completion, workshop downloads, and conflict-safe synchronization
- Observability: structured logging, correlation IDs, tracing, metrics, alerts, synthetic monitoring, and health/readiness checks
- Testing: unit, integration, API, contract, E2E, accessibility, security, performance, and recovery tests
- Delivery: protected branches, required checks, staging deployment, rollback plans, and environment separation

### Ordered Implementation Plan
1. Phase 1 - Foundations: authentication, core schema, middleware, logging, and baseline security.
2. Phase 2 - Core social features: supportive reactions, content warnings, trigger warnings, quick exit, chronological feeds, and draft support.
3. Phase 3 - Community and moderation: privacy levels, role management, moderation queues, appeals, and audit trails.
4. Phase 4 - Safety and crisis systems: crisis resource library, safety plans, wellness check-ins, escalation workflows, and consent-based support actions.
5. Phase 5 - Learning and wellness: workshops, modules, lessons, progress tracking, offline downloads, captions, and accessibility support.
6. Phase 6 - Privacy and data governance: data export, deletion, consent dashboards, retention, and transparency controls.
7. Phase 7 - Peer support: volunteer workflow, matching, supervision, escalation, and supporter wellness safeguards.
8. Phase 8 - Private messaging: only after messaging safety, moderation, reporting, blocking, and consent controls are mature.
9. Phase 9 - AI and personalization: optional, consent-based assistance with model cards, human review, and privacy protections.
10. Phase 10 - Observability and infrastructure: tracing, metrics, synthetic monitoring, disaster recovery, and performance tuning.
11. Phase 11 - Future-ready extensibility: clinical dashboards, FHIR-compatible data, wearable integrations, and organization portals.

## Middleware Pipeline

```
Request
  ↓
helmet() - Security headers
  ↓
cors() - CORS policy
  ↓
express.json() - Parse JSON
  ↓
injectRequestId - Add request ID
  ↓
requestLogger - Log request
  ↓
<route-specific middleware>
  ↓
authenticate/authorize - Auth check
  ↓
validateBody - Input validation
  ↓
<handler>
  ↓
errorHandler - Catch errors
  ↓
Response
```

##Security-First Design

### Authentication
- JWT tokens with RS256 signing (can upgrade to asymmetric)
- Refresh token rotation
- Expiring access tokens (7 days default)
- Session management per device

### Authorization
- Role-based access control (RBAC)
- Roles: guest, user, moderator, senior_moderator, admin
- Role-based middleware: `authorize(Role.ADMIN, Role.MODERATOR)`

### Password Security
- Argon2id hashing (resistant to GPU attacks)
- Configurable password strength requirements
- Minimum 12 characters (configurable)
- Requires uppercase, numbers, special characters

### Input Validation
- Zod schemas for all inputs
- Type-safe validation with automatic inference
- Consistent error response format
- Early validation in middleware

### Rate Limiting
- Simple in-memory implementation (Redis-ready)
- Different limits for auth endpoints (5 per 15 min)
- General endpoints (100 per minute)
- Per-IP tracking

### Error Handling
- Custom error classes: `AppError`, `ValidationError`, `NotFoundError`
- Consistent error response format
- No sensitive data in error messages
- Automatic logging of errors

## Database Schema

40+ models organized by domain:

### User Domain
- `User`: Core user account
- `UserProfile`: Display info
- `UserRole`: Role assignments
- `UserPreference`: Notification/UI preferences
- `PrivacySettings`: Privacy controls
- `AccessibilitySettings`: Accessibility options
- `Device`: Device registration
- `Session`: Active sessions
- `Consent`: User consents
- `EmergencyContact`: Crisis contacts
- `TrustedContact`: Shared access contacts

### Social Domain
- `Post`: Social posts with media
- `PostMedia`: Images/videos
- `Comment`: Nested comments
- `Reaction`: Supportive reactions (no downvotes)
- `Community`: Community spaces
- `CommunityMember`: Membership records

### Safety & Moderation
- `Report`: User reports
- `Notification`: User notifications
- `AuditLog`: All actions logged
- `ErrorLog`: Errors for debugging

### Private Data
- `JournalEntry`: Private journal entries
- `LearningProgress`: Workshop progress

### Resources
- `Workshop`: Educational content
- `CrisisResource`: Support resources

## API Design

### Principles
- REST API with JSON
- Versioned endpoints: `/api/v1/`
- Consistent response format
- Pagination with limit/offset
- Resource-centric paths

### Request/Response Format

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe"
}
```

**Successful Response (2xx):**
```json
{
  "success": true,
  "data": {
	"id": "user-123",
	"email": "user@example.com"
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": {
	"code": "VALIDATION_ERROR",
	"message": "Password too weak",
	"details": [...]
  }
}
```

### Authentication
- Bearer token in Authorization header
- `Authorization: Bearer <jwt-token>`
- Optional endpoints with `optionalAuth` middleware
- Protected endpoints with `authenticate` middleware

## Scaling Considerations

### Horizontal Scaling
- Stateless service design
- Session tokens stored in DB (not in-memory)
- No local file storage
- CDN for media assets

### Database Scaling
- Indexed key columns for queries
- Partitioning strategy for large tables
- Read replicas for reporting
- Archive old data (journals, posts)

### Caching Strategy
- Redis for session cache (future)
- Request-level caching for user profile
- CDN for media assets
- ETags for API responses

### Event-Driven Architecture (Future)
- Events for cross-module communication
- Message queue (RabbitMQ/Kafka) for async work
- Event sourcing for audit trail
- Eventual consistency for denormalized data

## Testing Strategy

### Unit Tests
- Service business logic
- Auth functions (hashing, JWT)
- Utility functions
- Repository queries

### Integration Tests
- Database interactions
- Service layer orchestration
- Complex business logic

### E2E Tests
- API endpoint workflows
- Auth flow (register → login → access)
- User journeys
- Error scenarios

### Test Organization
```
tests/
├── auth/               # Auth tests
├── modules/            # Module tests
│   ├── user/
│   └── post/
└── api/                # E2E tests
	└── user.e2e.test.ts
```

## Deployment Architecture

### Environments
```
Development
├── Node.js dev server with hot reload
└── Local PostgreSQL

Staging
├── Containerized Node app
├── Staging PostgreSQL
└── Full test suite

Production
├── Kubernetes cluster with multiple replicas
├── Managed PostgreSQL (RDS/Cloud SQL)
├── CDN for static assets
├── Monitoring and alerting
└── Blue-green deployments
```

### CI/CD Pipeline
1. **Commit**: Push to feature branch
2. **Test**: Run tests, linting, type checking
3. **Build**: Create Docker image
4. **Staging**: Deploy to staging for E2E tests
5. **Approval**: Manual approval for production
6. **Production**: Blue-green deployment
7. **Monitoring**: Alert on errors/slowness

## Performance Considerations

### Query Optimization
- Indexes on frequently queried columns
- Eager loading with `include` to avoid N+1 queries
- Pagination for large result sets
- Denormalization for read-heavy data

### Caching
- User profile caching (5 min)
- Workshop list caching (1 hour)
- Community data caching (10 min)
- Cache invalidation on update

### API Response Times
- Target < 200ms for most endpoints
- < 500ms for complex operations
- Pagination to limit result size
- Compression for large responses

## Security Audit

- [ ] All passwords hashed with Argon2id
- [ ] All endpoints validated with middleware
- [ ] SQL injection prevented with Prisma
- [ ] XSS prevented with JSON responses
- [ ] CSRF protection via CORS
- [ ] Rate limiting on sensitive endpoints
- [ ] Audit logs for user actions
- [ ] PII encrypted in transit and at rest
- [ ] Regular security scanning
- [ ] Penetration testing before launch

## Operational Considerations

### Logging
- Structured JSON logs with pino
- Request correlation IDs
- Async logging to avoid blocking
- Log aggregation (CloudWatch/ELK)
- Log retention policies

### Monitoring
- Application metrics (response time, errors)
- Database metrics (query latency, connections)
- Infrastructure metrics (CPU, memory, disk)
- Alerting on thresholds
- Performance dashboards

### Backup & Disaster Recovery
- Daily automated backups
- Point-in-time recovery capability
- Cross-region replication
- Documented recovery procedures
- Tested recovery drills

## Ordered Delivery Roadmap

The implementation plan should follow this sequence to keep the platform safe, privacy-conscious, and extensible:

1. Phase 1 - Foundations: authentication, schema, logging, and core security.
2. Phase 2 - Core social features: supportive reactions, content warnings, trigger warnings, quick exit, and chronological feed enforcement.
3. Phase 3 - Community and moderation: privacy levels, roles, moderation queue, appeals, and audit trails.
4. Phase 4 - Safety and crisis systems: crisis resources, safety plans, wellness check-ins, and escalation workflows.
5. Phase 5 - Learning and wellness: workshops, progress tracking, offline support, accessibility, and review workflows.
6. Phase 6 - Privacy and data governance: data export, deletion, consent history, and retention management.
7. Phase 7 - Peer support program: volunteer workflows, matching, supervision, and escalation procedures.
8. Phase 8 - Private messaging and DMs: only after safety and moderation controls are mature.
9. Phase 9 - AI and personalization: optional, consent-based assistance and transparent model governance.
10. Phase 10 - Observability and infrastructure: tracing, monitoring, alerting, and disaster recovery.
11. Phase 11 - Future-ready extensibility: clinical workflows, interoperable health data, wearable integrations, and organization portals.

##Future Enhancements

### Phase 2
- Real-time features (WebSocket)
- Private messaging
- Video streaming
- Mobile app SDKs

### Phase 3
- Clinical integrations
- Therapist portal
- Healthcare data (FHIR)
- Wearable integrations

### Phase 4
- AI/ML features
- Predictive analytics
- Recommendation engine
- Natural language processing

### Phase 5
- Global distribution
- Multi-region deployment
- Advanced search (Elasticsearch)
- Analytics platform

## Development Guidelines

### Code Quality
- TypeScript strict mode
- ESLint for code style
- Prettier for formatting
- 50%+ test coverage

### Commit Messages
- Conventional commits format
- Clear description of changes
- Reference issue numbers

### Pull Request Process
1. Create feature branch
2. Add tests for new code
3. Run full test suite
4. Request code review
5. Address feedback
6. Merge to main

### Documentation
- JSDoc for public functions
- README for modules
- Architecture Decision Records (ADRs)
- Runbook for operations
