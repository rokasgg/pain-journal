import { getNowAction, isMorningOptionalToday } from './checkinTiming';

describe('getNowAction', () => {
  it('is morning before the evening unlock, evening after', () => {
    expect(getNowAction({ hour: 9, morningDone: false, eveningDone: false })).toBe('morning');
    expect(getNowAction({ hour: 17, morningDone: false, eveningDone: false })).toBe('evening');
  });

  it('nudges nothing once the current one is done', () => {
    expect(getNowAction({ hour: 12, morningDone: true, eveningDone: false })).toBeNull();
    expect(getNowAction({ hour: 20, morningDone: true, eveningDone: true })).toBeNull();
  });

  it('never nudges a missed morning in the evening', () => {
    expect(getNowAction({ hour: 20, morningDone: false, eveningDone: true })).toBeNull();
  });
});

describe('isMorningOptionalToday', () => {
  it('only applies to a brand-new user in the evening', () => {
    expect(isMorningOptionalToday({ hour: 18, loggedDays: 0 })).toBe(true);
    expect(isMorningOptionalToday({ hour: 10, loggedDays: 0 })).toBe(false);
    expect(isMorningOptionalToday({ hour: 18, loggedDays: 3 })).toBe(false);
  });
});
