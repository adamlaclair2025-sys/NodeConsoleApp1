import { z } from 'zod';

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

export const CreateConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  participantIds: z.array(z.string().min(1)).min(1, 'At least one participant required'),
  name: z.string().optional().refine(
    (val) => !val || (val.length > 0 && val.length <= 100),
    'Conversation name must be between 1 and 100 characters'
  ),
  description: z.string().optional().refine(
    (val) => !val || (val.length > 0 && val.length <= 500),
    'Description must be between 1 and 500 characters'
  ),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const UpdateConversationSchema = z.object({
  name: z.string().optional().refine(
    (val) => !val || (val.length > 0 && val.length <= 100),
    'Conversation name must be between 1 and 100 characters'
  ),
  description: z.string().optional().refine(
    (val) => !val || (val.length > 0 && val.length <= 500),
    'Description must be between 1 and 500 characters'
  ),
});

export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;

export const MuteConversationSchema = z.object({
  mutedUntil: z.number().int().positive('Must provide future timestamp').optional(),
  mute: z.boolean().optional(),
});

export type MuteConversationInput = z.infer<typeof MuteConversationSchema>;

export const AddConversationMemberSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user required').max(50, 'Cannot add more than 50 users at once'),
  role: z.enum(['member', 'moderator']).default('member'),
});

export type AddConversationMemberInput = z.infer<typeof AddConversationMemberSchema>;

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const CreateMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID required'),
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters')
    .trim(),
  attachments: z.array(z.object({
    fileUrl: z.string().url('Invalid file URL'),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().regex(/^[\w-]+\/[\w\-.+]+$/, 'Invalid MIME type'),
    size: z.number().int().positive().max(100 * 1024 * 1024, 'File cannot exceed 100MB'),
  })).optional().default([]),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export const UpdateMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters')
    .trim(),
});

export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;

export const GetMessagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  direction: z.enum(['before', 'after']).default('before'),
});

export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;

// ============================================================================
// MESSAGE REPORTING SCHEMAS
// ============================================================================

export const ReportMessageSchema = z.object({
  reason: z.enum([
    'harassment',
    'hate_speech',
    'self_harm',
    'violence',
    'misinformation',
    'spam',
    'adult_content',
    'copyright',
    'other',
  ]),
  description: z.string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
});

export type ReportMessageInput = z.infer<typeof ReportMessageSchema>;

// ============================================================================
// MESSAGE ATTACHMENT SCHEMAS
// ============================================================================

export const GetUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().regex(/^[\w-]+\/[\w\-.+]+$$/, 'Invalid MIME type'),
  size: z.number().int().positive().max(100 * 1024 * 1024, 'File cannot exceed 100MB'),
});

export type GetUploadUrlInput = z.infer<typeof GetUploadUrlSchema>;

// ============================================================================
// CONVERSATION QUERY SCHEMAS
// ============================================================================

export const GetConversationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  includeArchived: z.boolean().default(false),
  searchText: z.string().optional(),
});

export type GetConversationsInput = z.infer<typeof GetConversationsSchema>;

export const SearchConversationSchema = z.object({
  query: z.string().min(1).max(255),
  limit: z.number().int().min(1).max(50).default(20),
});

export type SearchConversationInput = z.infer<typeof SearchConversationSchema>;

// ============================================================================
// PRESENCE & TYPING SCHEMAS
// ============================================================================

export const TypingIndicatorSchema = z.object({
  conversationId: z.string().min(1),
  isTyping: z.boolean(),
});

export type TypingIndicatorInput = z.infer<typeof TypingIndicatorSchema>;

// ============================================================================
// SAFETY & MODERATION SCHEMAS
// ============================================================================

const SAFETY_KEYWORDS = [
  'self-harm',
  'suicide',
  'abuse',
  'violence',
  // Additional keywords can be loaded from database
];

export const MessageModerationSchema = z.object({
  content: z.string(),
  conversationId: z.string(),
  authorId: z.string(),
}).refine(
  (data) => {
    // Check for safety keywords - case insensitive
    const lowerContent = data.content.toLowerCase();
    return !SAFETY_KEYWORDS.some((keyword) => lowerContent.includes(keyword));
  },
  {
    message: 'Message contains concerning content and may be flagged for review',
    path: ['content'],
  }
);

export type MessageModerationInput = z.infer<typeof MessageModerationSchema>;

// ============================================================================
// RATE LIMITING SCHEMAS
// ============================================================================

export const MessageRateLimitSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
  timestamp: z.number().int(),
});

export type MessageRateLimitInput = z.infer<typeof MessageRateLimitSchema>;
