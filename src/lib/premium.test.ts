import { freeHistoryStart, isActiveEntitlement, isHistoryDateLocked, isPremiumFeature } from './premium';

describe('freeHistoryStart', () => {
  it('covers 30 days including today', () => {
    expect(freeHistoryStart('2026-11-25')).toBe('2026-10-27');
  });

  it('crosses a year boundary in local dates', () => {
    expect(freeHistoryStart('2027-01-10')).toBe('2026-12-12');
  });
});

describe('isHistoryDateLocked', () => {
  it('keeps the last 30 days open for free users', () => {
    expect(isHistoryDateLocked('2026-11-25', '2026-11-25', false)).toBe(false);
    expect(isHistoryDateLocked('2026-10-27', '2026-11-25', false)).toBe(false);
  });

  it('locks older days for free users', () => {
    expect(isHistoryDateLocked('2026-10-26', '2026-11-25', false)).toBe(true);
  });

  it('never locks for Premium', () => {
    expect(isHistoryDateLocked('2020-01-01', '2026-11-25', true)).toBe(false);
  });
});

describe('isActiveEntitlement', () => {
  const now = new Date('2026-11-25T12:00:00Z');

  it('is active until the expiry passes', () => {
    expect(isActiveEntitlement({ expires_at: '2026-11-25T12:00:01Z' }, now)).toBe(true);
    expect(isActiveEntitlement({ expires_at: '2026-11-25T11:59:59Z' }, now)).toBe(false);
  });

  it('treats missing rows and expiries as not active', () => {
    expect(isActiveEntitlement(null, now)).toBe(false);
    expect(isActiveEntitlement({ expires_at: null }, now)).toBe(false);
  });
});

describe('isPremiumFeature', () => {
  it('accepts known features only', () => {
    expect(isPremiumFeature('ai')).toBe(true);
    expect(isPremiumFeature('checkins')).toBe(false);
    expect(isPremiumFeature(undefined)).toBe(false);
  });
});
