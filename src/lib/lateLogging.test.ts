import { canLogLate, getSlotStatus, lateLogDeadline } from '@/lib/lateLogging';

const TODAY = '2026-10-21';

describe('getSlotStatus', () => {
  const base = { today: TODAY, hour: 10, logged: false };

  it('logged wins for any past or current day', () => {
    expect(getSlotStatus({ ...base, date: '2026-10-01', type: 'morning', logged: true })).toBe('logged');
    expect(getSlotStatus({ ...base, date: TODAY, type: 'evening', logged: true })).toBe('logged');
  });

  it('today: morning is open now, evening opens at 16:00', () => {
    expect(getSlotStatus({ ...base, date: TODAY, type: 'morning' })).toBe('canLogNow');
    expect(getSlotStatus({ ...base, date: TODAY, type: 'evening', hour: 15 })).toBe('opensLater');
    expect(getSlotStatus({ ...base, date: TODAY, type: 'evening', hour: 16 })).toBe('canLogNow');
  });

  it('yesterday and the day before can be logged late, both slots', () => {
    expect(getSlotStatus({ ...base, date: '2026-10-20', type: 'morning' })).toBe('canLogLate');
    expect(getSlotStatus({ ...base, date: '2026-10-20', type: 'evening', hour: 0 })).toBe('canLogLate');
    expect(getSlotStatus({ ...base, date: '2026-10-19', type: 'evening' })).toBe('canLogLate');
  });

  it('nothing older than two days', () => {
    expect(getSlotStatus({ ...base, date: '2026-10-18', type: 'morning' })).toBe('missed');
  });

  it('future days', () => {
    expect(getSlotStatus({ ...base, date: '2026-10-22', type: 'morning' })).toBe('future');
    expect(getSlotStatus({ ...base, date: '2026-10-22', type: 'morning', logged: true })).toBe('future');
  });

  it('works across a month boundary', () => {
    expect(getSlotStatus({ ...base, today: '2026-11-01', date: '2026-10-30', type: 'morning' })).toBe('canLogLate');
    expect(getSlotStatus({ ...base, today: '2026-11-01', date: '2026-10-29', type: 'morning' })).toBe('missed');
  });
});

describe('lateLogDeadline', () => {
  it('yesterday → tomorrow 23:59, the day before → today 23:59', () => {
    expect(lateLogDeadline('2026-10-20', TODAY)).toBe('tomorrow');
    expect(lateLogDeadline('2026-10-19', TODAY)).toBe('today');
  });

  it('null for today, older days and the future', () => {
    expect(lateLogDeadline(TODAY, TODAY)).toBeNull();
    expect(lateLogDeadline('2026-10-18', TODAY)).toBeNull();
    expect(lateLogDeadline('2026-10-22', TODAY)).toBeNull();
    expect(canLogLate('2026-10-18', TODAY)).toBe(false);
    expect(canLogLate('2026-10-20', TODAY)).toBe(true);
  });
});
