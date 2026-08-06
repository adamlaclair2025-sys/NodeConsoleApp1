-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deactivated', 'deleted');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('guest', 'user', 'community_moderator', 'senior_moderator', 'support_staff', 'admin');

-- CreateTable
CREATE TABLE "User" (
	"id" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"password" TEXT NOT NULL,
	"status" "UserStatus" NOT NULL DEFAULT 'active',
	"emailVerified" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"deletedAt" TIMESTAMP(3),

	CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"displayName" TEXT NOT NULL,
	"username" TEXT,
	"bio" VARCHAR(500),
	"avatar" TEXT,
	"banner" TEXT,
	"pronouns" TEXT,
	"website" TEXT,
	"location" TEXT,
	"timezone" TEXT NOT NULL DEFAULT 'UTC',
	"isVerified" BOOLEAN NOT NULL DEFAULT false,
	"isPublic" BOOLEAN NOT NULL DEFAULT true,
	"recoveryMilestones" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"role" "Role" NOT NULL,
	"grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"language" TEXT NOT NULL DEFAULT 'en',
	"timezone" TEXT NOT NULL DEFAULT 'UTC',
	"notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
	"emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
	"pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
	"digestFrequency" TEXT NOT NULL DEFAULT 'daily',
	"marketingEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
	"quietHourStart" TEXT,
	"quietHourEnd" TEXT,
	"allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
	"allowMentions" BOOLEAN NOT NULL DEFAULT true,
	"allowCommunityInvites" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"profileVisibility" TEXT NOT NULL DEFAULT 'public',
	"searchableByOthers" BOOLEAN NOT NULL DEFAULT true,
	"showOnlineStatus" BOOLEAN NOT NULL DEFAULT false,
	"showActivityStatus" BOOLEAN NOT NULL DEFAULT false,
	"allowDataExport" BOOLEAN NOT NULL DEFAULT true,
	"allowAnalytics" BOOLEAN NOT NULL DEFAULT false,
	"shareHealthData" BOOLEAN NOT NULL DEFAULT false,
	"dataRetentionMonths" INTEGER NOT NULL DEFAULT 12,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessibilitySettings" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"reducedMotion" BOOLEAN NOT NULL DEFAULT false,
	"highContrast" BOOLEAN NOT NULL DEFAULT false,
	"fontSize" INTEGER NOT NULL DEFAULT 16,
	"fontFamily" TEXT NOT NULL DEFAULT 'system',
	"reducedTransparency" BOOLEAN NOT NULL DEFAULT false,
	"screenReaderOptimized" BOOLEAN NOT NULL DEFAULT false,
	"keyboardNavigationOnly" BOOLEAN NOT NULL DEFAULT false,
	"dyslexiaFriendlyFont" BOOLEAN NOT NULL DEFAULT false,
	"textSpacing" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "AccessibilitySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"deviceId" TEXT NOT NULL,
	"deviceName" TEXT,
	"deviceType" TEXT NOT NULL DEFAULT 'web',
	"os" TEXT,
	"browser" TEXT,
	"ipAddress" TEXT,
	"userAgent" TEXT,
	"lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"deviceId" TEXT,
	"refreshToken" TEXT NOT NULL,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	"revokedAt" TIMESTAMP(3),
	"ipAddress" TEXT,
	"userAgent" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"consentType" TEXT NOT NULL,
	"version" TEXT NOT NULL,
	"givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"revokedAt" TIMESTAMP(3),
	"ipAddress" TEXT,
	"userAgent" TEXT,

	CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
	"id" TEXT NOT NULL,
	"authorId" TEXT NOT NULL,
	"communityId" TEXT,
	"content" TEXT NOT NULL,
	"visibility" TEXT NOT NULL DEFAULT 'public',
	"isAnonymous" BOOLEAN NOT NULL DEFAULT false,
	"status" TEXT NOT NULL DEFAULT 'published',
	"contentWarning" TEXT,
	"triggerWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
	"allowComments" BOOLEAN NOT NULL DEFAULT true,
	"allowReactions" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"deletedAt" TIMESTAMP(3),
	"publishedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMedia" (
	"id" TEXT NOT NULL,
	"postId" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"url" TEXT NOT NULL,
	"altText" TEXT,
	"caption" VARCHAR(500),
	"metadata" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
	"id" TEXT NOT NULL,
	"authorId" TEXT NOT NULL,
	"postId" TEXT NOT NULL,
	"parentCommentId" TEXT,
	"content" TEXT NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'published',
	"isAnonymous" BOOLEAN NOT NULL DEFAULT false,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"deletedAt" TIMESTAMP(3),

	CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"postId" TEXT,
	"commentId" TEXT,
	"reactionType" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
	"id" TEXT NOT NULL,
	"creatorId" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"description" TEXT,
	"avatar" TEXT,
	"banner" TEXT,
	"visibility" TEXT NOT NULL DEFAULT 'public',
	"joinPolicy" TEXT NOT NULL DEFAULT 'open',
	"memberCount" INTEGER NOT NULL DEFAULT 0,
	"isVerified" BOOLEAN NOT NULL DEFAULT false,
	"isStaffLed" BOOLEAN NOT NULL DEFAULT false,
	"rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
	"guidelines" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"archivedAt" TIMESTAMP(3),

	CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
	"id" TEXT NOT NULL,
	"communityId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"role" TEXT NOT NULL DEFAULT 'member',
	"joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"bannedUntil" TIMESTAMP(3),

	CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
	"id" TEXT NOT NULL,
	"reporterId" TEXT NOT NULL,
	"postId" TEXT,
	"commentId" TEXT,
	"communityId" TEXT,
	"userId" TEXT,
	"reason" TEXT NOT NULL,
	"description" TEXT,
	"status" TEXT NOT NULL DEFAULT 'open',
	"priority" TEXT NOT NULL DEFAULT 'normal',
	"resolution" TEXT,
	"resolvedBy" TEXT,
	"resolvedAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"moodTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
	"isEncrypted" BOOLEAN NOT NULL DEFAULT false,
	"encryptionKey" TEXT,
	"isPrivate" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"deletedAt" TIMESTAMP(3),

	CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workshop" (
	"id" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"description" TEXT,
	"slug" TEXT NOT NULL,
	"content" TEXT,
	"contentType" TEXT NOT NULL DEFAULT 'text',
	"mediaUrl" TEXT,
	"duration" INTEGER,
	"difficulty" TEXT NOT NULL DEFAULT 'beginner',
	"category" TEXT[],
	"isPublished" BOOLEAN NOT NULL DEFAULT false,
	"isApproved" BOOLEAN NOT NULL DEFAULT false,
	"isClinicalReview" BOOLEAN NOT NULL DEFAULT false,
	"creatorId" TEXT,
	"viewCount" INTEGER NOT NULL DEFAULT 0,
	"completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProgress" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"workshopId" TEXT NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'started',
	"progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
	"completedAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisResource" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"organization" TEXT,
	"description" TEXT,
	"country" TEXT NOT NULL,
	"region" TEXT,
	"languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
	"phone" TEXT,
	"sms" BOOLEAN NOT NULL DEFAULT false,
	"chat" BOOLEAN NOT NULL DEFAULT false,
	"website" TEXT,
	"hoursInfo" TEXT,
	"costInfo" TEXT,
	"accessibility" TEXT[],
	"categories" TEXT[],
	"featured" BOOLEAN NOT NULL DEFAULT false,
	"verifiedAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "CrisisResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"type" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"message" TEXT NOT NULL,
	"actionUrl" TEXT,
	"isRead" BOOLEAN NOT NULL DEFAULT false,
	"readAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
	"id" TEXT NOT NULL,
	"userId" TEXT,
	"action" TEXT NOT NULL,
	"resource" TEXT NOT NULL,
	"resourceId" TEXT,
	"changes" JSONB,
	"ipAddress" TEXT,
	"userAgent" TEXT,
	"timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
	"id" TEXT NOT NULL,
	"code" TEXT NOT NULL,
	"message" TEXT NOT NULL,
	"stackTrace" TEXT,
	"context" JSONB,
	"userId" TEXT,
	"timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_username_idx" ON "UserProfile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");

-- CreateIndex
CREATE INDEX "PrivacySettings_userId_idx" ON "PrivacySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilitySettings_userId_key" ON "AccessibilitySettings"("userId");

-- CreateIndex
CREATE INDEX "AccessibilitySettings_userId_idx" ON "AccessibilitySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_deviceId_key" ON "Device"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_consentType_idx" ON "Consent"("consentType");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- CreateIndex
CREATE INDEX "Post_visibility_idx" ON "Post"("visibility");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE INDEX "PostMedia_postId_idx" ON "PostMedia"("postId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_postId_commentId_reactionType_key" ON "Reaction"("userId", "postId", "commentId", "reactionType");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");

-- CreateIndex
CREATE INDEX "Reaction_commentId_idx" ON "Reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_creatorId_idx" ON "Community"("creatorId");

-- CreateIndex
CREATE INDEX "Community_slug_idx" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_visibility_idx" ON "Community"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_communityId_userId_key" ON "CommunityMember"("communityId", "userId");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_idx" ON "CommunityMember"("communityId");

-- CreateIndex
CREATE INDEX "CommunityMember_userId_idx" ON "CommunityMember"("userId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_priority_idx" ON "Report"("priority");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_idx" ON "JournalEntry"("userId");

-- CreateIndex
CREATE INDEX "JournalEntry_createdAt_idx" ON "JournalEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_slug_key" ON "Workshop"("slug");

-- CreateIndex
CREATE INDEX "Workshop_slug_idx" ON "Workshop"("slug");

-- CreateIndex
CREATE INDEX "Workshop_isPublished_idx" ON "Workshop"("isPublished");

-- CreateIndex
CREATE INDEX "Workshop_category_idx" ON "Workshop"("category");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_userId_workshopId_key" ON "LearningProgress"("userId", "workshopId");

-- CreateIndex
CREATE INDEX "CrisisResource_country_idx" ON "CrisisResource"("country");

-- CreateIndex
CREATE INDEX "CrisisResource_region_idx" ON "CrisisResource"("region");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "ErrorLog_code_idx" ON "ErrorLog"("code");

-- CreateIndex
CREATE INDEX "ErrorLog_timestamp_idx" ON "ErrorLog"("timestamp");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessibilitySettings" ADD CONSTRAINT "AccessibilitySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
