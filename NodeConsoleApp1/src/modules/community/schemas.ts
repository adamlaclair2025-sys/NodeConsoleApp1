import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private', 'hidden', 'invite-only']).default('public'),
  joinPolicy: z.enum(['open', 'approve', 'invite']).default('open'),
  moderationMode: z.enum(['standard', 'review', 'strict']).default('standard'),
  approvalRequired: z.boolean().default(false),
  rules: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  guidelines: z.string().max(2000).optional(),
});

export const updateCommunitySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  joinPolicy: z.enum(['open', 'approve', 'invite']).optional(),
  visibility: z.enum(['public', 'private', 'hidden', 'invite-only']).optional(),
  moderationMode: z.enum(['standard', 'review', 'strict']).optional(),
  approvalRequired: z.boolean().optional(),
  rules: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  guidelines: z.string().max(2000).optional(),
});

export const createReportSchema = z.object({
  reason: z.enum([
    'spam',
    'harassment',
    'violence',
    'hate_speech',
    'self_harm',
    'misinformation',
    'other',
  ]),
  description: z.string().max(1000).optional(),
  postId: z.string().optional(),
  commentId: z.string().optional(),
  communityId: z.string().optional(),
  userId: z.string().optional(),
  reviewState: z.enum(['pending', 'reviewed', 'escalated']).optional(),
  evidence: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  appealReason: z.string().max(2000).optional(),
});

export const communitySafetySchema = z.object({
  userId: z.string().trim().min(1),
  reason: z.string().max(500).optional(),
});

export const commentModerationSchema = z.object({
  moderationState: z.enum(['active', 'reviewed', 'locked']).optional(),
  isLocked: z.boolean().optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type CommunitySafetyInput = z.infer<typeof communitySafetySchema>;
export type CommentModerationInput = z.infer<typeof commentModerationSchema>;
