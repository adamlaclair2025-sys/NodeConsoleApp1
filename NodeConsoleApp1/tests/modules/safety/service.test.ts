import { buildQuickExitPayload } from '@/modules/safety/service';

describe('buildQuickExitPayload', () => {
  it('returns a neutral destination and safety guidance', () => {
    const payload = buildQuickExitPayload('https://example.com');

    expect(payload.destination).toBe('https://example.com');
    expect(payload.title).toBe('Quick Exit');
    expect(payload.supports).toContain('keyboard accessible');
    expect(payload.note).toContain('does not erase');
  });
});
