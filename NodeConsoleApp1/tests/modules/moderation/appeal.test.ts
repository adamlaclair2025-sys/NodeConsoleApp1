import { submitAppealSchema, reviewAppealSchema } from '@/modules/moderation/schemas';

describe('moderation appeal schemas', () => {
  it('accepts a user-submitted appeal reason', () => {
    const result = submitAppealSchema.safeParse({
      reason: 'I believe this report was made in error and would like a review.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toContain('review');
    }
  });

  it('accepts moderator review decisions', () => {
    const result = reviewAppealSchema.safeParse({
      decision: 'approved',
      resolution: 'The appeal has been reviewed and no further action is required.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decision).toBe('approved');
    }
  });
});
