import { createPostSchema } from '@/modules/post/schemas';

describe('createPostSchema', () => {
  it('accepts audience, anonymity, and draft metadata', () => {
    const result = createPostSchema.safeParse({
      content: 'A reflective post',
      visibility: 'community',
      audience: 'community-members',
      isAnonymous: true,
      anonymousAlias: 'Quiet Friend',
      isDraft: true,
      triggerWarnings: ['grief'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe('community');
      expect(result.data.audience).toBe('community-members');
      expect(result.data.isDraft).toBe(true);
    }
  });
});
