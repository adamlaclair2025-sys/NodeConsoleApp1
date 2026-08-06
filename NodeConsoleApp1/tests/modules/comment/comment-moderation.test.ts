import { commentModerationSchema } from '@/modules/comment/schemas';

describe('commentModerationSchema', () => {
  it('accepts moderation lock and review state values', () => {
    const result = commentModerationSchema.safeParse({
      moderationState: 'locked',
      isLocked: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moderationState).toBe('locked');
      expect(result.data.isLocked).toBe(true);
    }
  });
});
