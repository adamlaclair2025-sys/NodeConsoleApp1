# API Reference

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

Obtain token via `/auth/login` or `/auth/register`.

---

## Health & Status

### Health Check
```
GET /health
```

Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

### Status
```
GET /status
```

Returns server status with optional auth information.

**Response:**
```json
{
  "status": "operational",
  "authenticated": true,
  "userId": "user-123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Authentication

### Register

```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
	"user": {
	  "id": "clx123...",
	  "email": "user@example.com",
	  "displayName": "John Doe"
	},
	"accessToken": "eyJhbGc...",
	"refreshToken": "eyJhbGc..."
  }
}
```

**Errors:**
- 400: Email invalid, password weak, or passwords don't match
- 409: Email already registered

---

### Login

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"user": {
	  "id": "clx123...",
	  "email": "user@example.com",
	  "displayName": "John Doe"
	},
	"accessToken": "eyJhbGc...",
	"refreshToken": "eyJhbGc..."
  }
}
```

**Errors:**
- 401: Invalid email or password
- 400: Validation error

---

## Users

### Get Current User

```
GET /users/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "clx123...",
	"email": "user@example.com",
	"profile": {
	  "displayName": "John Doe",
	  "username": "johndoe",
	  "bio": "Mental health advocate",
	  "avatar": "https://...",
	  "pronouns": "he/him"
	}
  }
}
```

---

### Update Profile

```
PATCH /users/me/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "John Doe",
  "bio": "Mental health advocate",
  "pronouns": "he/him",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "clx123...",
	"email": "user@example.com",
	"profile": { ... }
  }
}
```

---

### Delete Account

```
DELETE /users/me
Authorization: Bearer <token>
```

**Response (204):** No content

---

## Posts

### Get Feed

```
GET /posts/feed
Authorization: Bearer <token> (optional)

Query Parameters:
- limit: number (default 20, max 100)
- offset: number (default 0)
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "post-123",
	  "content": "Feeling better today",
	  "author": {
		"id": "user-123",
		"profile": { "displayName": "John" }
	  },
	  "createdAt": "2024-01-15T10:00:00Z",
	  "reactions": [...],
	  "_count": {
		"comments": 5,
		"reactions": 12
	  }
	}
  ],
  "pagination": {
	"limit": 20,
	"offset": 0
  }
}
```

---

### Create Post

```
POST /posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Feeling grateful today",
  "visibility": "public",
  "isAnonymous": false,
  "contentWarning": null
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
	"id": "post-123",
	"content": "Feeling grateful today",
	"authorId": "user-123",
	"visibility": "public",
	"createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Get Post

```
GET /posts/:id
Authorization: Bearer <token> (optional)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "post-123",
	"content": "...",
	"author": { ... },
	"comments": [...],
	"reactions": [...]
  }
}
```

---

### Delete Post

```
DELETE /posts/:id
Authorization: Bearer <token>
```

**Response (204):** No content

---

## Communities

### List Communities

```
GET /communities
Query Parameters:
- limit: number
- offset: number
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "comm-123",
	  "name": "Peer Support Circle",
	  "slug": "peer-support-circle",
	  "description": "A safe space...",
	  "visibility": "public",
	  "memberCount": 156
	}
  ],
  "pagination": { ... }
}
```

---

### Get Community

```
GET /communities/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "comm-123",
	"name": "Peer Support Circle",
	"description": "...",
	"_count": {
	  "members": 156,
	  "posts": 42
	}
  }
}
```

---

### Create Community

```
POST /communities
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Recovery Warriors",
  "slug": "recovery-warriors",
  "description": "A group for recovery support",
  "visibility": "public",
  "joinPolicy": "open"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
	"id": "comm-123",
	"name": "Recovery Warriors",
	"creatorId": "user-123"
  }
}
```

---

### Join Community

```
POST /communities/:id/join
Authorization: Bearer <token>
```

**Response (201):**
```json
{
  "success": true,
  "data": {
	"id": "member-123",
	"communityId": "comm-123",
	"userId": "user-123",
	"role": "member",
	"joinedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Leave Community

```
DELETE /communities/:id/leave
Authorization: Bearer <token>
```

**Response (204):** No content

---

### Get Community Members

```
GET /communities/:id/members
Query Parameters:
- limit: number
- offset: number
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "member-123",
	  "user": {
		"id": "user-123",
		"profile": { "displayName": "John" }
	  },
	  "role": "member",
	  "joinedAt": "2024-01-10T00:00:00Z"
	}
  ],
  "pagination": { ... }
}
```

---

## Search

### Global Search

```
GET /search
Query Parameters:
- q: string (min 2 chars)
- type: 'posts' | 'communities' | 'users' (optional)
- limit: number (default 20, max 100)
- offset: number (default 0)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"posts": [
	  {
		"id": "post-123",
		"content": "...",
		"author": { ... }
	  }
	],
	"communities": [
	  {
		"id": "comm-123",
		"name": "...",
		"memberCount": 42
	  }
	]
  },
  "pagination": { ... }
}
```

---

## Reports & Moderation

### Create Report

```
POST /reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "harassment",
  "description": "This user is harassing me",
  "postId": "post-123"
}
```

Reason options:
- `spam`
- `harassment`
- `violence`
- `hate_speech`
- `self_harm`
- `misinformation`
- `other`

**Response (201):**
```json
{
  "success": true,
  "data": {
	"id": "report-123",
	"reporterId": "user-123",
	"reason": "harassment",
	"status": "open",
	"priority": "high"
  }
}
```

---

### Get Report

```
GET /reports/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "report-123",
	"status": "open",
	"reason": "harassment",
	"description": "..."
  }
}
```

---

### Get Moderation Queue (Admin Only)

```
GET /moderation/queue
Authorization: Bearer <admin_token>
Query Parameters:
- limit: number
- offset: number
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "report-123",
	  "reason": "harassment",
	  "priority": "high",
	  "status": "open",
	  "createdAt": "2024-01-15T10:00:00Z"
	}
  ],
  "pagination": { ... }
}
```

---

### Resolve Report (Admin Only)

```
POST /reports/:id/resolve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "resolution": "Content removed, user warned",
  "action": "remove_content"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "report-123",
	"status": "resolved",
	"resolvedBy": "admin-123",
	"resolvedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Journal

### Create Journal Entry

```
POST /journal
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Today was a good day...",
  "moodTags": ["happy", "grateful", "hopeful"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
	"id": "entry-123",
	"userId": "user-123",
	"content": "...",
	"moodTags": ["happy", "grateful", "hopeful"],
	"isPrivate": true,
	"createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Get Journal Entries

```
GET /journal
Authorization: Bearer <token>
Query Parameters:
- limit: number (default 20)
- offset: number (default 0)
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "entry-123",
	  "content": "...",
	  "moodTags": ["happy"],
	  "createdAt": "2024-01-15T10:30:00Z"
	}
  ],
  "pagination": { ... }
}
```

---

### Get Mood Statistics

```
GET /journal/stats
Authorization: Bearer <token>
Query Parameters:
- days: number (default 30, max 365)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"happy": 15,
	"grateful": 12,
	"hopeful": 10,
	"anxious": 5
  }
}
```

---

### Update Journal Entry

```
PATCH /journal/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated entry",
  "moodTags": ["happy", "relaxed"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### Delete Journal Entry

```
DELETE /journal/:id
Authorization: Bearer <token>
```

**Response (204):** No content

---

## Workshops

### List Workshops

```
GET /workshops
Query Parameters:
- limit: number (default 20)
- offset: number (default 0)
- difficulty: 'beginner' | 'intermediate' | 'advanced'
- category: string
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "workshop-123",
	  "title": "Introduction to Mindfulness",
	  "slug": "intro-mindfulness",
	  "difficulty": "beginner",
	  "duration": 1800,
	  "viewCount": 234
	}
  ],
  "pagination": { ... }
}
```

---

### Get Workshop

```
GET /workshops/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "workshop-123",
	"title": "...",
	"content": "...",
	"mediaUrl": "https://...",
	"duration": 1800
  }
}
```

---

### Start Workshop

```
POST /workshops/:id/start
Authorization: Bearer <token>
```

**Response (201):**
```json
{
  "success": true,
  "data": {
	"id": "progress-123",
	"workshopId": "workshop-123",
	"userId": "user-123",
	"status": "in_progress",
	"progressPercent": 0
  }
}
```

---

### Update Workshop Progress

```
PATCH /workshops/:id/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "progressPercent": 50
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
	"id": "progress-123",
	"progressPercent": 50,
	"status": "in_progress"
  }
}
```

---

### Get Learning Progress

```
GET /workshops/progress
Authorization: Bearer <token>
Query Parameters:
- limit: number
- offset: number
```

**Response (200):**
```json
{
  "success": true,
  "data": [
	{
	  "id": "progress-123",
	  "workshop": { ... },
	  "progressPercent": 75,
	  "status": "in_progress",
	  "updatedAt": "2024-01-15T10:30:00Z"
	}
  ],
  "pagination": { ... }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
	"code": "ERROR_CODE",
	"message": "Human readable message",
	"details": [...]
  }
}
```

### Common Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created
- `204 No Content`: Success with no body
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limited
- `500 Internal Server Error`: Server error

---

## Rate Limiting

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642259400
```

When rate limited (429):
```json
{
  "error": {
	"code": "RATE_LIMIT_EXCEEDED",
	"message": "Too many requests",
	"retryAfter": 60
  }
}
```

---

## Pagination

Paginated endpoints use:
- `limit`: Number of results (max 100)
- `offset`: Number of results to skip

Response includes:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
	"limit": 20,
	"offset": 0
  }
}
```

---

## Request ID Tracking

All responses include a request ID for debugging:

```
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

Include this in support requests.
