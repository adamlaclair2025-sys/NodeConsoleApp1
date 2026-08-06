import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().trim().min(1, 'Content is required').max(5000, 'Content is too long'),
  communityId: z.string().trim().min(1).optional(),
  visibility: z.enum(['public', 'private', 'community', 'followers']).optional(),
  audience: z.enum(['everyone', 'community-members', 'trusted-contacts']).optional(),
  isAnonymous: z.boolean().optional(),
  anonymousAlias: z.string().trim().max(80).optional(),
  contentWarning: z.string().trim().max(300).optional(),
  triggerWarnings: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  allowComments: z.boolean().optional(),
  allowReactions: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

export const updatePostSchema = z.object({
  content: z.string().trim().min(1, 'Content is required').max(5000, 'Content is too long').optional(),
  visibility: z.enum(['public', 'private', 'community', 'followers']).optional(),
  audience: z.enum(['everyone', 'community-members', 'trusted-contacts']).optional(),
  isAnonymous: z.boolean().optional(),
  anonymousAlias: z.string().trim().max(80).optional(),
  contentWarning: z.string().trim().max(300).optional(),
  triggerWarnings: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  allowComments: z.boolean().optional(),
  allowReactions: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
