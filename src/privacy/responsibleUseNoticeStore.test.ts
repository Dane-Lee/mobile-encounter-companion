import { describe, expect, it } from 'vitest';
import { normalizeResponsibleUseNoticeAcceptance } from './responsibleUseNoticeStore';

describe('normalizeResponsibleUseNoticeAcceptance', () => {
  it('accepts valid notice acceptance records', () => {
    expect(
      normalizeResponsibleUseNoticeAcceptance({
        version: '2026-04-29',
        acceptedAt: '2026-04-29T12:00:00.000Z',
      }),
    ).toEqual({
      version: '2026-04-29',
      acceptedAt: '2026-04-29T12:00:00.000Z',
    });
  });

  it('rejects malformed records', () => {
    expect(normalizeResponsibleUseNoticeAcceptance(null)).toBeNull();
    expect(normalizeResponsibleUseNoticeAcceptance({ version: '2026-04-29' })).toBeNull();
    expect(normalizeResponsibleUseNoticeAcceptance({ acceptedAt: 'now' })).toBeNull();
  });
});
