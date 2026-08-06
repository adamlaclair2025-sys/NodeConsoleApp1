import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  isAnonymous: z.boolean().default(false),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const commentModerationSchema = z.object({
  moderationState: z.enum(['active', 'reviewed', 'locked']).optional(),
  isLocked: z.boolean().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentModerationInput = z.infer<typeof commentModerationSchema>;
