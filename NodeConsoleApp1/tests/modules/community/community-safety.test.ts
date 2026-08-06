import { communitySafetySchema } from '@/modules/community/schemas';

describe('communitySafetySchema', () => {
  it('accepts a user id and optional reason for block or mute actions', () => {
    const result = communitySafetySchema.safeParse({
      userId: 'user_123',
      reason: 'Repeated hostility',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe('user_123');
      expect(result.data.reason).toBe('Repeated hostility');
    }
  });
});
