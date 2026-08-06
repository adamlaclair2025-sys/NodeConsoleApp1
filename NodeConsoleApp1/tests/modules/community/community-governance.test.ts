import { createCommunitySchema } from '@/modules/community/schemas';

describe('createCommunitySchema', () => {
  it('accepts privacy and moderation metadata', () => {
    const result = createCommunitySchema.safeParse({
      name: 'Recovery Circle',
      slug: 'recovery-circle',
      visibility: 'invite-only',
      joinPolicy: 'approve',
      moderationMode: 'review',
      approvalRequired: true,
      rules: ['Be kind'],
      guidelines: 'Supportive and respectful conversation only.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe('invite-only');
      expect(result.data.approvalRequired).toBe(true);
      expect(result.data.rules).toHaveLength(1);
    }
  });
});
