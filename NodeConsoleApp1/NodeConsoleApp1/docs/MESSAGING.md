# Real-Time Messaging Module

## Overview

The messaging module provides secure, scalable real-time communication capabilities for the mental health platform. It supports direct 1-to-1 conversations and group messaging with comprehensive safety controls, moderation, and privacy features.

## Features

- **Direct Messaging**: Private 1-to-1 conversations with automatic duplicate prevention
- **Group Conversations**: Multi-user group chats with member management
- **Real-time Updates**: WebSocket-based instant message delivery using Socket.IO
- **Read Receipts**: Track message read status with per-user read indicators
- **Message Editing**: Modify messages within 1-hour window with edit history
- **Message Deletion**: Soft-delete messages with audit trails
- **Content Moderation**: Automatic screening for safety keywords, abuse patterns, spam
- **Message Reporting**: User-driven moderation reporting with status tracking
- **Typing Indicators**: Real-time typing status with auto-timeout
- **User Presence**: Online/offline status tracking
- **Mute Controls**: Users can mute conversations to reduce notifications
- **Rate Limiting**: Per-user and per-conversation message rate limits
- **File Attachments**: Support for media attachments with file type validation

## Architecture

### Layers

```
┌─────────────────────────────────────────┐
│        Client (Web/Mobile)              │
└────────────────┬────────────────────────┘
				 │
		┌────────▼────────┐
		│  REST API       │
		│  WebSocket API  │
		└────────┬────────┘
		/api/v1/messaging/*
		(WebSocket: message.send, etc.)
				 │
		┌────────▼────────────────────┐
		│    Services Layer           │
		│ - ConversationService       │
		│ - MessageService            │
		│ - MessageModerationService  │
		│ - WebSocketServer           │
		└────────┬────────────────────┘
				 │
		┌────────▼────────┐
		│  Prisma ORM     │
		│  (Database)     │
		└─────────────────┘
		Conversation
		ConversationMember
		Message
		MessageAttachment
		MessageRead
		MessageReport
```

### Key Components

#### 1. **ConversationService** (`src/modules/messaging/conversation.service.ts`)
Manages conversation lifecycle:
- Create conversations (with duplicate DM detection)
- Get conversation details
- List user's conversations with pagination
- Search conversations by name/participants
- Update conversation metadata
- Add/remove members
- Leave conversation
- Mute/archive conversations

#### 2. **MessageService** (`src/modules/messaging/message.service.ts`)
Handles message operations:
- Send messages with moderation screening and rate limiting
- Get messages with cursor-based pagination
- Edit messages (time-limited)
- Delete messages (soft-delete)
- Mark messages as read
- Get read receipts
- Report messages
- Generate file upload URLs

#### 3. **MessageModerationService** (`src/modules/messaging/moderation.service.ts`)
Provides content safety:
- Screen messages for safety keywords and harmful content
- Detect spam patterns (excessive caps, repetitive characters)
- Assess crisis risk indicators
- Analyze user behavior patterns
- Create moderation queue entries
- Integration point for future AI-based content moderation

#### 4. **WebSocketServer** (`src/modules/messaging/websocket-server.ts`)
Real-time communication:
- JWT authentication for WebSocket connections
- Message sending/editing/deleting
- Read receipts
- Typing indicators with auto-timeout
- User presence tracking
- Conversation subscriptions
- Connection pooling and graceful disconnection

## API Endpoints

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/messaging/conversations | List user's conversations |
| POST | /api/v1/messaging/conversations | Create new conversation |
| GET | /api/v1/messaging/conversations/:conversationId | Get conversation details |
| PUT | /api/v1/messaging/conversations/:conversationId | Update conversation |
| POST | /api/v1/messaging/conversations/:conversationId/members | Add members |
| DELETE | /api/v1/messaging/conversations/:conversationId/members/:userId | Remove member |
| POST | /api/v1/messaging/conversations/:conversationId/leave | Leave conversation |
| POST | /api/v1/messaging/conversations/:conversationId/mute | Mute/unmute conversation |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/messaging/conversations/:conversationId/messages | Get message history |
| POST | /api/v1/messaging/conversations/:conversationId/messages | Send message |
| PUT | /api/v1/messaging/conversations/:conversationId/messages/:messageId | Edit message |
| DELETE | /api/v1/messaging/conversations/:conversationId/messages/:messageId | Delete message |
| POST | /api/v1/messaging/conversations/:conversationId/messages/:messageId/read | Mark as read |
| GET | /api/v1/messaging/conversations/:conversationId/messages/:messageId/read-receipts | Get read receipts |
| POST | /api/v1/messaging/conversations/:conversationId/messages/:messageId/report | Report message |

## WebSocket Events

### Client → Server

```javascript
// Message Events
socket.emit('message.send', {
  conversationId: 'conv-123',
  content: 'Hello!',
  attachments: [{ fileUrl, fileName, mimeType, size }]
});

socket.emit('message.edit', {
  messageId: 'msg-456',
  content: 'Updated message'
});

socket.emit('message.delete', {
  messageId: 'msg-456',
  conversationId: 'conv-123'
});

socket.emit('message.read', {
  messageId: 'msg-456',
  conversationId: 'conv-123'
});

// Presence Events
socket.emit('presence.join', { conversationId: 'conv-123' });
socket.emit('presence.leave', { conversationId: 'conv-123' });

// Typing Events
socket.emit('typing.start', { conversationId: 'conv-123' });
socket.emit('typing.stop', { conversationId: 'conv-123' });

// Conversation Events
socket.emit('conversation.subscribe', { conversationId: 'conv-123' });
socket.emit('conversation.unsubscribe', { conversationId: 'conv-123' });
```

### Server → Client

```javascript
// Message Events
socket.on('message.send', (data) => {
  // { id, author, content, attachments, createdAt, conversationId }
});

socket.on('message.edit', (data) => {
  // { id, content, editedAt }
});

socket.on('message.delete', (data) => {
  // { id }
});

socket.on('message.read', (data) => {
  // { messageId, userId, readAt }
});

// Presence Events
socket.on('presence.user-joined', (data) => {
  // { userId, displayName, conversationId }
});

socket.on('presence.user-left', (data) => {
  // { userId, conversationId }
});

// Typing Events
socket.on('typing.indicator', (data) => {
  // { userId, displayName, isTyping, conversationId }
});

// User Status Events
socket.on('user.online', (data) => {
  // { userId, displayName, timestamp }
});

socket.on('user.offline', (data) => {
  // { userId, timestamp }
});
```

## Database Schema

### Conversation
```sql
CREATE TABLE "Conversation" (
  id TEXT PRIMARY KEY,
  type ENUM ('direct', 'group'),
  name VARCHAR(255),
  description VARCHAR(500),
  createdBy TEXT FOREIGN KEY,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  archivedAt TIMESTAMP,
  isEncrypted BOOLEAN,
  encryptionKeyId TEXT,
  lastMessageAt TIMESTAMP
);
```

### ConversationMember
```sql
CREATE TABLE "ConversationMember" (
  id TEXT PRIMARY KEY,
  conversationId TEXT FOREIGN KEY,
  userId TEXT FOREIGN KEY,
  role ENUM ('member', 'moderator', 'owner'),
  joinedAt TIMESTAMP,
  mutedUntil TIMESTAMP,
  leftAt TIMESTAMP
);
```

### Message
```sql
CREATE TABLE "Message" (
  id TEXT PRIMARY KEY,
  conversationId TEXT FOREIGN KEY,
  authorId TEXT FOREIGN KEY,
  content TEXT,
  isDeleted BOOLEAN,
  deletedAt TIMESTAMP,
  editedAt TIMESTAMP,
  isEncrypted BOOLEAN,
  encryptionKeyId TEXT,
  createdAt TIMESTAMP
);
```

### MessageAttachment
```sql
CREATE TABLE "MessageAttachment" (
  id TEXT PRIMARY KEY,
  messageId TEXT FOREIGN KEY,
  fileUrl TEXT,
  fileName VARCHAR(255),
  mimeType VARCHAR(100),
  size INTEGER,
  uploadedAt TIMESTAMP
);
```

### MessageRead
```sql
CREATE TABLE "MessageRead" (
  id TEXT PRIMARY KEY,
  messageId TEXT FOREIGN KEY,
  userId TEXT,
  conversationMemberId TEXT FOREIGN KEY,
  readAt TIMESTAMP
);
```

### MessageReport
```sql
CREATE TABLE "MessageReport" (
  id TEXT PRIMARY KEY,
  messageId TEXT FOREIGN KEY,
  reporterId TEXT FOREIGN KEY,
  reason VARCHAR(100),
  description TEXT,
  status ENUM ('pending', 'reviewing', 'resolved', 'dismissed'),
  createdAt TIMESTAMP,
  resolvedAt TIMESTAMP,
  resolvedBy TEXT FOREIGN KEY,
  resolutionNotes TEXT
);
```

## Safety & Moderation

### Content Screening
Messages are automatically screened for:
- **Safety Keywords**: Suicide, self-harm, abuse indicators
- **Abuse Patterns**: Hate speech, harassment language
- **Spam**: Excessive caps (>70%), repetitive characters (>9 repetitions)

Flagged messages create moderation entries for human review.

### Rate Limiting
- **Global**: Max 20 messages/minute per user
- **Per-Conversation**: Max 5 messages/minute per user per conversation
- Violations result in error: "sending messages too quickly"

### Message Reporting
Users can report messages with reasons:
- harassment
- hate_speech
- self_harm
- violence
- misinformation
- spam
- adult_content
- copyright
- other

Preventing duplicate reports from same user.

### Crisis Detection
Messages are assessed for crisis risk indicators:
- "suicide"
- "kill myself"
- "want to die"
- "end it all"
- "self-harm"
- Future: Integration with crisis intervention system

## Error Handling

### Common Errors

| Code | Message | Cause |
|------|---------|-------|
| 400 | Message cannot be empty | Content is blank/whitespace |
| 400 | Message cannot exceed 5000 characters | Content too long |
| 400 | You are sending messages too quickly | Rate limit exceeded |
| 400 | Not a member of this conversation | User not in conversation |
| 400 | Can only edit your own messages | Attempted to edit others' message |
| 400 | Cannot edit messages older than 1 hour | Message too old to edit |
| 404 | Conversation not found | Invalid conversation ID |
| 404 | Message not found | Invalid message ID |
| 401 | Unauthorized | Missing/invalid authentication token |

## Performance Considerations

### Indexing
- `Conversation.createdBy`, `type`, `lastMessageAt`, `archivedAt`
- `ConversationMember.conversationId`, `userId`, `leftAt`
- `Message.conversationId`, `authorId`, `createdAt`, `isDeleted`
- `MessageRead.messageId`, `userId`, `readAt`
- `MessageReport.messageId`, `reporterId`, `status`, `createdAt`

### Query Optimization
- Cursor-based pagination for messages (avoid OFFSET)
- Soft-delete for messages (logical delete, not physical)
- Lazy loading of attachments and read receipts
- Connection pooling for WebSocket

### Scaling Strategies
- **Horizontal Scaling**: Socket.IO Redis adapter for multi-instance deployment
- **Database Sharding**: By conversation ID for very large deployments
- **Message Archival**: Archive old messages to cold storage
- **Read Receipt Batching**: Batch read updates to reduce database load

## Future Enhancements

### Encryption
- End-to-end encryption (E2E) support with per-message keys
- Client-side encryption/decryption
- Key management and rotation

### AI & Moderation
- Machine learning-based content moderation
- Toxicity detection and scoring
- Automated response suggestions
- Duplicate message detection

### Features
- Message reactions (non-dislike emojis)
- Message threading/replies
- Rich text formatting and markdown
- Voice/video call integration
- Message search with full-text indexing
- Message scheduling/delayed send

### Compliance
- HIPAA-aligned audit logging
- Message retention policies
- GDPR data export for conversations
- Encryption key escrow for law enforcement

## Testing

### Unit Tests
- Message validation schemas
- Moderation service content screening
- Rate limit calculations

### Integration Tests
- Full conversation lifecycle
- Message send/edit/delete workflow
- Permission enforcement
- Read receipt functionality
- Message reporting

### E2E Tests
- WebSocket connection and authentication
- Real-time message delivery
- Typing indicators and presence
- Conversation subscription/unsubscription

Run tests:
```bash
npm run test -- tests/modules/messaging/

# Coverage report
npm run test:coverage -- tests/modules/messaging/
```

## Deployment

1. **Database Migration**:
```bash
npm run db:migrate -- --name messaging
```

2. **Environment Variables**:
```env
CORS_ORIGIN=https://yourdomain.com
WS_ORIGIN=https://yourdomain.com
MAX_MESSAGE_SIZE=5000
RATE_LIMIT_MESSAGES_PER_MINUTE=20
```

3. **Socket.IO Configuration**:
```typescript
// Automatic via initializeWebSocketServer in app.ts
// For Redis adapter in production:
const { createAdapter } = require("@socket.io/redis-adapter");
io.adapter(createAdapter(pubClient, subClient));
```

## Support & Troubleshooting

### Common Issues

**Messages not delivering in real-time**
- Verify WebSocket connection: browser dev tools → Network → WS
- Check CORS origin configuration
- Ensure JWT token is valid

**Rate limiting too aggressive**
- Adjust RATE_LIMIT_MESSAGES_PER_MINUTE in config
- Consider per-user tier limits

**High database load**
- Enable read receipt batching
- Archive old conversations
- Implement connection pooling

**Message moderation too sensitive**
- Review SAFETY_KEYWORDS list
- Adjust abuse pattern regex
- Consider human review threshold

## Security

### Implemented Controls
- ✅ JWT authentication on all endpoints and WebSocket
- ✅ RBAC for conversation management (owner/moderator/member)
- ✅ Input validation (Zod schemas)
- ✅ Rate limiting per user and conversation
- ✅ Message content screening
- ✅ Access control verification per conversation
- ✅ Audit logging of all operations
- ✅ Soft-delete audit trail

### Future Controls
- End-to-end encryption
- Encryption at rest
- TLS 1.3 for transport
- CSRF protection
- SQL injection prevention (ORM-based)
- XSS prevention
- Rate limiting via Redis

## License

This module is part of the enterprise mental health platform and is subject to the project license.
