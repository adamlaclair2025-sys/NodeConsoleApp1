import { createReportSchema } from '@/modules/community/schemas';

describe('createReportSchema', () => {
  it('accepts triage metadata for moderation review', () => {
    const result = createReportSchema.safeParse({
      reason: 'harassment',
      description: 'Repeated hostile replies',
      reviewState: 'reviewed',
      evidence: ['screenshot-1', 'message-2'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('harassment');
    }
  });
});
