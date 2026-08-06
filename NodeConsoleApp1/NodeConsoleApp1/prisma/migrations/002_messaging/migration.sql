-- ============================================================================
-- MESSAGING & REAL-TIME COMMUNICATION
-- ============================================================================

-- Conversation table for 1-to-1 direct messages and group chats
CREATE TABLE "Conversation" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"type" TEXT NOT NULL DEFAULT 'direct',
	"name" TEXT,
	"description" VARCHAR(500),
	"createdBy" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"archivedAt" TIMESTAMP(3),
	"isEncrypted" BOOLEAN NOT NULL DEFAULT false,
	"encryptionKeyId" TEXT,
	"lastMessageAt" TIMESTAMP(3),
	CONSTRAINT "Conversation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- ConversationMember: tracks membership and metadata per user in each conversation
CREATE TABLE "ConversationMember" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"conversationId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"role" TEXT NOT NULL DEFAULT 'member',
	"joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"mutedUntil" TIMESTAMP(3),
	"leftAt" TIMESTAMP(3),
	CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE,
	CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Unique constraint: a user can only be a member once per conversation
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");
CREATE INDEX "ConversationMember_conversationId_idx" ON "ConversationMember"("conversationId");
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");
CREATE INDEX "ConversationMember_leftAt_idx" ON "ConversationMember"("leftAt");

-- Message table: actual message content
CREATE TABLE "Message" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"conversationId" TEXT NOT NULL,
	"authorId" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"isDeleted" BOOLEAN NOT NULL DEFAULT false,
	"deletedAt" TIMESTAMP(3),
	"editedAt" TIMESTAMP(3),
	"isEncrypted" BOOLEAN NOT NULL DEFAULT false,
	"encryptionKeyId" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE,
	CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_authorId_idx" ON "Message"("authorId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX "Message_isDeleted_idx" ON "Message"("isDeleted");

-- MessageAttachment: files/media attached to messages
CREATE TABLE "MessageAttachment" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"messageId" TEXT NOT NULL,
	"fileUrl" TEXT NOT NULL,
	"fileName" TEXT NOT NULL,
	"mimeType" TEXT NOT NULL,
	"size" INTEGER NOT NULL,
	"uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE
);

CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- MessageRead: track which users have read which messages (read receipts)
CREATE TABLE "MessageRead" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"messageId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"conversationMemberId" TEXT NOT NULL,
	"readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE,
	CONSTRAINT "MessageRead_conversationMemberId_fkey" FOREIGN KEY ("conversationMemberId") REFERENCES "ConversationMember" ("id") ON DELETE CASCADE
);

-- Unique constraint: a user reads a message only once
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");
CREATE INDEX "MessageRead_messageId_idx" ON "MessageRead"("messageId");
CREATE INDEX "MessageRead_userId_idx" ON "MessageRead"("userId");
CREATE INDEX "MessageRead_readAt_idx" ON "MessageRead"("readAt");

-- MessageReport: moderation reports on individual messages
CREATE TABLE "MessageReport" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"messageId" TEXT NOT NULL,
	"reporterId" TEXT NOT NULL,
	"reason" TEXT NOT NULL,
	"description" TEXT,
	"status" TEXT NOT NULL DEFAULT 'pending',
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"resolvedAt" TIMESTAMP(3),
	"resolvedBy" TEXT,
	"resolutionNotes" TEXT,
	CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id"),
	CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE,
	CONSTRAINT "MessageReport_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE INDEX "MessageReport_messageId_idx" ON "MessageReport"("messageId");
CREATE INDEX "MessageReport_reporterId_idx" ON "MessageReport"("reporterId");
CREATE INDEX "MessageReport_status_idx" ON "MessageReport"("status");
CREATE INDEX "MessageReport_createdAt_idx" ON "MessageReport"("createdAt");

-- Indexes for performance
CREATE INDEX "Conversation_createdBy_idx" ON "Conversation"("createdBy");
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX "Conversation_archivedAt_idx" ON "Conversation"("archivedAt");
